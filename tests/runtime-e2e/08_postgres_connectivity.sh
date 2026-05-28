#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
source tests/runtime-e2e/runtime_e2e_lib.sh
require_deps
print_context

request_json "08_postgres_health" GET "$HEALTH_URL" "" no-auth >/dev/null
assert_status "08_postgres_health" 200
assert_jq "08_postgres_health" '.checks.postgres == true'

request_json "08_postgres_readiness" GET "$READINESS_URL" "" no-auth >/dev/null
assert_status "08_postgres_readiness" 200
assert_jq "08_postgres_readiness" '.ok == true'
assert_jq "08_postgres_readiness" '.checklist.supabase_healthy == true'
assert_jq "08_postgres_readiness" '.checklist.audit_logs_active == true'

echo "expected output: PostgreSQL/Supabase Session Pooler answers select 1"
