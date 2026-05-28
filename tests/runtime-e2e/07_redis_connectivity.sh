#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
source tests/runtime-e2e/runtime_e2e_lib.sh
require_deps
print_context

request_json "07_redis_health" GET "$HEALTH_URL" "" no-auth >/dev/null
assert_status "07_redis_health" 200
assert_jq "07_redis_health" '.checks.redis == true'

request_json "07_redis_readiness" GET "$READINESS_URL" "" no-auth >/dev/null
assert_status "07_redis_readiness" 200
assert_jq "07_redis_readiness" '.ok == true'
assert_jq "07_redis_readiness" '.checklist.redis_healthy == true'
assert_jq "07_redis_readiness" '.checklist.locks_configured == true'

echo "expected output: Redis ping succeeds through /health and readiness lock checks are active"
