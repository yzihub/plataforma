#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
source tests/runtime-e2e/runtime_e2e_lib.sh
require_deps
print_context

request_json "02_healthcheck" GET "$HEALTH_URL" "" no-auth >/dev/null
assert_status "02_healthcheck" 200
assert_jq "02_healthcheck" '.ok == true'
assert_jq "02_healthcheck" '.checks.mode == "behavioral_qa"'
assert_jq "02_healthcheck" '.checks.redis == true'
assert_jq "02_healthcheck" '.checks.postgres == true'
assert_jq "02_healthcheck" '.checks.guardian_active == true'

echo "expected output: { ok: true, checks: { postgres: true, redis: true, mode: \"behavioral_qa\" } }"
