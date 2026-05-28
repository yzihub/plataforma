#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${RUNTIME_E2E_BASE_URL:-https://runtime.yzihub.com}"
TURN_URL="${BASE_URL%/}/cognitive/turn"
HEALTH_URL="${BASE_URL%/}/health"
READINESS_URL="${BASE_URL%/}/runtime/readiness"
PILOT_OVERRIDE_URL="${BASE_URL%/}/pilot/override"

WEBHOOK_SECRET="${JUREMA_TOOL_WEBHOOK_SECRET:-${RUNTIME_COGNITIVE_WEBHOOK_SECRET:-${EVOLUTION_WEBHOOK_SECRET:-${RUNTIME_E2E_WEBHOOK_SECRET:-}}}}"
TENANT_ID="${JU_BEHAVIORAL_QA_TENANT_ID:-${RUNTIME_E2E_TENANT_ID:-00000000-0000-4000-8000-000000000001}}"
QA_PHONE="${JU_BEHAVIORAL_QA_PHONE:-${RUNTIME_E2E_QA_PHONE:-5583999990002}}"
RUN_ID="${RUNTIME_E2E_RUN_ID:-runtime-e2e-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM}"
OUT_DIR="${RUNTIME_E2E_OUT_DIR:-tests/runtime-e2e/reports/$RUN_ID}"

mkdir -p "$OUT_DIR"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing dependency: $1" >&2
    exit 127
  }
}

require_deps() {
  require_cmd curl
  require_cmd jq
}

new_uuid() {
  local n
  n="${1:-$RANDOM$RANDOM}"
  printf '00000000-0000-4000-8000-%012x' "$n"
}

request_json() {
  local name="$1"
  local method="$2"
  local url="$3"
  local payload_file="${4:-}"
  local auth_mode="${5:-auth}"
  local body_file="$OUT_DIR/${name}.body.json"
  local status_file="$OUT_DIR/${name}.status"
  local request_id="$RUN_ID-$name"
  local args=(-sS -X "$method" "$url" -H "Content-Type: application/json" -H "x-request-id: $request_id")

  if [[ "$auth_mode" == "auth" && -n "$WEBHOOK_SECRET" ]]; then
    args+=(-H "x-webhook-secret: $WEBHOOK_SECRET")
  elif [[ "$auth_mode" == "wrong-auth" ]]; then
    args+=(-H "x-webhook-secret: definitely-wrong-secret")
  fi

  if [[ -n "$payload_file" ]]; then
    args+=(--data-binary "@$payload_file")
  fi

  echo "curl -sS -X $method $url -H 'Content-Type: application/json' -H 'x-request-id: $request_id'${WEBHOOK_SECRET:+ -H 'x-webhook-secret: ***'}${payload_file:+ --data-binary @$payload_file}"
  curl "${args[@]}" -o "$body_file" -w "%{http_code}" > "$status_file"
  echo "$body_file"
}

status_of() {
  cat "$OUT_DIR/${1}.status"
}

body_of() {
  printf '%s/%s.body.json' "$OUT_DIR" "$1"
}

assert_status() {
  local name="$1"
  local expected="$2"
  local actual
  actual="$(status_of "$name")"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL $name: expected HTTP $expected, got $actual" >&2
    cat "$(body_of "$name")" >&2 || true
    exit 1
  fi
  echo "PASS $name: HTTP $actual"
}

assert_status_in() {
  local name="$1"
  shift
  local actual expected
  actual="$(status_of "$name")"
  for expected in "$@"; do
    if [[ "$actual" == "$expected" ]]; then
      echo "PASS $name: HTTP $actual"
      return 0
    fi
  done
  echo "FAIL $name: expected one of [$*], got $actual" >&2
  cat "$(body_of "$name")" >&2 || true
  exit 1
}

assert_jq() {
  local name="$1"
  local filter="$2"
  if ! jq -e "$filter" "$(body_of "$name")" >/dev/null; then
    echo "FAIL $name: jq validation failed: $filter" >&2
    cat "$(body_of "$name")" >&2 || true
    exit 1
  fi
  echo "PASS $name: jq $filter"
}

turn_payload() {
  local file="$1"
  local message_id="$2"
  local conversation_id="$3"
  local text="$4"
  jq -n \
    --arg tenant_id "$TENANT_ID" \
    --arg run_id "$RUN_ID" \
    --arg message_id "$message_id" \
    --arg conversation_id "$conversation_id" \
    --arg phone "$QA_PHONE" \
    --arg text "$text" \
    '{
      event: "messages.upsert",
      instance: "Jurema Brokers - Runtime E2E",
      tenant_id: $tenant_id,
      conversation_id: $conversation_id,
      test_run_id: $run_id,
      audit: {
        suite: "runtime_e2e",
        run_id: $run_id,
        transport: "curl",
        behavioral_qa: true
      },
      data: {
        key: {
          id: $message_id,
          fromMe: false,
          remoteJid: ($phone + "@s.whatsapp.net")
        },
        pushName: "Lead QA Runtime",
        messageType: "conversation",
        message: {
          conversation: $text
        },
        messageTimestamp: (now | floor),
        source: "runtime-e2e:curl",
        contextInfo: {
          sourceChannel: "runtime_e2e",
          qa_audit: true,
          tenant_id: $tenant_id,
          test_run_id: $run_id
        }
      },
      shadow_original: {
        output: "Oi, sou a Ju. Me conta o que voce procura para eu te orientar melhor?",
        next_best_action: "continue_qualification",
        property_presentation_due: false,
        required_tools: [],
        funnel_stage: "discovery",
        qualification_depth: 1,
        governance_flags: {}
      }
    }' > "$file"
}

print_context() {
  echo "base_url=$BASE_URL"
  echo "turn_url=$TURN_URL"
  echo "tenant_id=$TENANT_ID"
  echo "qa_phone=$QA_PHONE"
  echo "run_id=$RUN_ID"
  echo "out_dir=$OUT_DIR"
}
