#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
source tests/runtime-e2e/runtime_e2e_lib.sh
require_deps
print_context

payload="$OUT_DIR/05_invalid_uuid_payload.json"
jq -n '{
  action: "pause_tenant",
  reason: "runtime e2e invalid uuid negative test",
  tenant_id: "not-a-valid-uuid",
  active: true
}' > "$payload"

request_json "05_invalid_uuid" POST "$PILOT_OVERRIDE_URL" "$payload" no-auth >/dev/null
assert_status "05_invalid_uuid" 400
assert_jq "05_invalid_uuid" '.ok == false and has("error")'
assert_jq "05_invalid_uuid" '((.error.fieldErrors.tenant_id // .error.tenant_id // .error | tostring) | ascii_downcase) | contains("uuid")'

echo "expected logs: runtime_request_completed url=/pilot/override status_code=400"
