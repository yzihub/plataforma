# Runtime Cognitive E2E Tests

Target default:

```bash
https://runtime.yzihub.com
```

Required tools: `bash`, `curl`, `jq`.

Recommended environment:

```bash
export RUNTIME_E2E_BASE_URL="https://runtime.yzihub.com"
export JUREMA_TOOL_WEBHOOK_SECRET="real-webhook-secret"
export JU_BEHAVIORAL_QA_TENANT_ID="00000000-0000-4000-8000-000000000001"
export JU_BEHAVIORAL_QA_PHONE="5583999990002"
```

Run the full regression:

```bash
bash tests/runtime-e2e/10_runtime_regression.sh
```

Run one test:

```bash
bash tests/runtime-e2e/01_smoke_cognitive_turn.sh
```

## Expected HTTP Codes

| Test | Expected |
| --- | --- |
| `01_smoke_cognitive_turn.sh` | `200` |
| `02_healthcheck.sh` | `200` |
| `03_payload_validation.sh` | `400`, `400` |
| `04_webhook_auth_validation.sh` | `401` when `JUREMA_TOOL_WEBHOOK_SECRET` is configured in runtime; otherwise warning |
| `05_invalid_uuid.sh` | `400` |
| `06_duplicate_message.sh` | `200`, `200 duplicate=true` |
| `07_redis_connectivity.sh` | `200`, `200` |
| `08_postgres_connectivity.sh` | `200`, `200` |
| `09_whatsapp_simulation.sh` | `200`, `200` |

## Real Curl Examples

Healthcheck:

```bash
curl -sS https://runtime.yzihub.com/health | jq .
```

Smoke turn:

```bash
curl -sS -X POST https://runtime.yzihub.com/cognitive/turn \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $JUREMA_TOOL_WEBHOOK_SECRET" \
  --data-binary @tests/runtime-e2e/reports/<run-id>/01_smoke_payload.json | jq .
```

Webhook auth negative:

```bash
curl -sS -X POST https://runtime.yzihub.com/cognitive/turn \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: wrong" \
  --data-binary @tests/runtime-e2e/reports/<run-id>/04_auth_payload.json | jq .
```

Invalid UUID:

```bash
curl -sS -X POST https://runtime.yzihub.com/pilot/override \
  -H "Content-Type: application/json" \
  --data '{"action":"pause_tenant","tenant_id":"not-a-valid-uuid","active":true}' | jq .
```

Redis/Postgres readiness:

```bash
curl -sS https://runtime.yzihub.com/runtime/readiness | jq '.checklist'
```

## Expected JSON Shapes

Health:

```json
{
  "ok": true,
  "checks": {
    "postgres": true,
    "redis": true,
    "mode": "behavioral_qa",
    "openai_configured": true,
    "guardian_active": true
  }
}
```

Duplicate message second request:

```json
{
  "ok": true,
  "duplicate": true,
  "message_id": "runtime-regression-...-duplicate-001",
  "conversation_id": "..."
}
```

Webhook auth rejection:

```json
{
  "ok": false,
  "error": "missing_webhook_secret"
}
```

## Expected Runtime Logs

Positive requests:

```text
runtime_request_started request_id=...
runtime_request_completed status_code=200 duration_ms=...
```

Webhook auth negative:

```text
runtime_webhook_rejected reason=missing_webhook_secret
runtime_webhook_rejected reason=invalid_webhook_secret
```

Duplicate message:

```text
runtime_webhook_duplicate_dropped message_id=...
```

## Output Files

Every run writes payloads, response bodies, HTTP status files, `regression.log`, and `summary.json` under:

```bash
tests/runtime-e2e/reports/<run-id>/
```
