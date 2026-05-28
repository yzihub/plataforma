#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
source tests/runtime-e2e/runtime_e2e_lib.sh
require_deps
print_context

payload="$OUT_DIR/04_auth_payload.json"
turn_payload "$payload" "$RUN_ID-auth-001" "$(new_uuid 401)" "Teste de autenticacao do webhook."

request_json "04_webhook_auth_missing" POST "$TURN_URL" "$payload" no-auth >/dev/null
if [[ -n "$WEBHOOK_SECRET" ]]; then
  assert_status "04_webhook_auth_missing" 401
else
  assert_status_in "04_webhook_auth_missing" 401 200
fi
if [[ "$(status_of 04_webhook_auth_missing)" == "401" ]]; then
  assert_jq "04_webhook_auth_missing" '.ok == false and .error == "missing_webhook_secret"'
else
  echo "WARN 04_webhook_auth_missing: endpoint accepted missing secret; JUREMA_TOOL_WEBHOOK_SECRET may be unset in runtime"
fi

request_json "04_webhook_auth_wrong" POST "$TURN_URL" "$payload" wrong-auth >/dev/null
if [[ -n "$WEBHOOK_SECRET" ]]; then
  assert_status "04_webhook_auth_wrong" 401
else
  assert_status_in "04_webhook_auth_wrong" 401 200
fi
if [[ "$(status_of 04_webhook_auth_wrong)" == "401" ]]; then
  assert_jq "04_webhook_auth_wrong" '.ok == false and .error == "invalid_webhook_secret"'
else
  echo "WARN 04_webhook_auth_wrong: endpoint accepted wrong secret; JUREMA_TOOL_WEBHOOK_SECRET may be unset in runtime"
fi

echo "expected logs when secret is configured: runtime_webhook_rejected reason=missing_webhook_secret/invalid_webhook_secret"
