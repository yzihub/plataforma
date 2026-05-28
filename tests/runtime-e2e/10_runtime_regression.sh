#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

export RUNTIME_E2E_RUN_ID="${RUNTIME_E2E_RUN_ID:-runtime-regression-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM}"
export RUNTIME_E2E_OUT_DIR="${RUNTIME_E2E_OUT_DIR:-tests/runtime-e2e/reports/$RUNTIME_E2E_RUN_ID}"
mkdir -p "$RUNTIME_E2E_OUT_DIR"

log="$RUNTIME_E2E_OUT_DIR/regression.log"
: > "$log"

run_test() {
  local script="$1"
  echo "===== $script =====" | tee -a "$log"
  if bash "tests/runtime-e2e/$script" 2>&1 | tee -a "$log"; then
    echo "PASS $script" | tee -a "$log"
  else
    echo "FAIL $script" | tee -a "$log"
    exit 1
  fi
}

run_test 02_healthcheck.sh
run_test 03_payload_validation.sh
run_test 04_webhook_auth_validation.sh
run_test 05_invalid_uuid.sh
run_test 07_redis_connectivity.sh
run_test 08_postgres_connectivity.sh
run_test 01_smoke_cognitive_turn.sh
run_test 06_duplicate_message.sh
run_test 09_whatsapp_simulation.sh

summary="$RUNTIME_E2E_OUT_DIR/summary.json"
jq -n \
  --arg run_id "$RUNTIME_E2E_RUN_ID" \
  --arg base_url "${RUNTIME_E2E_BASE_URL:-https://runtime.yzihub.com}" \
  --arg log "$log" \
  --arg generated_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{
    ok: true,
    run_id: $run_id,
    base_url: $base_url,
    generated_at: $generated_at,
    log: $log,
    tests: [
      "healthcheck",
      "payload_validation",
      "webhook_auth_validation",
      "invalid_uuid",
      "redis_connectivity",
      "postgres_connectivity",
      "smoke_cognitive_turn",
      "duplicate_message",
      "whatsapp_simulation"
    ]
  }' > "$summary"

echo "REGRESSION PASS"
echo "summary=$summary"
echo "log=$log"
