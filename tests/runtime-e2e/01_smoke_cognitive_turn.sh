#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
source tests/runtime-e2e/runtime_e2e_lib.sh
require_deps
print_context

conversation_id="$(new_uuid 101)"
payload="$OUT_DIR/01_smoke_payload.json"
turn_payload "$payload" "$RUN_ID-smoke-001" "$conversation_id" "Oi Ju, quero conhecer apartamentos no Cabo Branco."

request_json "01_smoke_cognitive_turn" POST "$TURN_URL" "$payload" auth >/dev/null
assert_status "01_smoke_cognitive_turn" 200
assert_jq "01_smoke_cognitive_turn" 'has("ok") and (.ok | type == "boolean")'
assert_jq "01_smoke_cognitive_turn" ".webhook.message_id == \"$RUN_ID-smoke-001\""
assert_jq "01_smoke_cognitive_turn" '.webhook.duplicate == false'
assert_jq "01_smoke_cognitive_turn" 'has("cutover") and has("pilot") and has("cost")'

echo "expected logs: runtime_request_started, runtime_request_completed status_code=200"
