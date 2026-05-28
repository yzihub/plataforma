#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
source tests/runtime-e2e/runtime_e2e_lib.sh
require_deps
print_context

conversation_id="$(new_uuid 601)"
message_id="$RUN_ID-duplicate-001"
payload="$OUT_DIR/06_duplicate_payload.json"
turn_payload "$payload" "$message_id" "$conversation_id" "Mensagem duplicada para validar idempotencia."

request_json "06_duplicate_first" POST "$TURN_URL" "$payload" auth >/dev/null
assert_status "06_duplicate_first" 200
assert_jq "06_duplicate_first" 'has("ok") and (.ok | type == "boolean")'
assert_jq "06_duplicate_first" '.webhook.duplicate == false'

request_json "06_duplicate_second" POST "$TURN_URL" "$payload" auth >/dev/null
assert_status "06_duplicate_second" 200
assert_jq "06_duplicate_second" '.ok == true'
assert_jq "06_duplicate_second" '.duplicate == true'
assert_jq "06_duplicate_second" ".message_id == \"$message_id\""

echo "expected logs: runtime_webhook_duplicate_dropped message_id=$message_id"
