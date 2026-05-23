#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="${JU_E2E_ENDPOINT:-http://localhost:3002/api/ju-super-xml/e2e}"
OUT_DIR="tests/results/scenario_02_cold_lead"
mkdir -p "$OUT_DIR"

cat > "$OUT_DIR/request.json" <<'JSON'
{
  "scenario_id": "02_cold_lead",
  "utm_source": "google",
  "utm_campaign": "apartamento_joao_pessoa",
  "lead_context": "curioso, orcamento incompativel, sem timing, baixa maturidade",
  "user_message": "Estou so olhando apartamento em Joao Pessoa ainda. Nao tenho muita ideia de valor nem prazo.",
  "expected": {
    "bairro": "Joao Pessoa",
    "intent": "explorar",
    "conversation_stage": "descoberta",
    "maturity": "baixa",
    "emotional_context": "curiosidade inicial sem decisao formada"
  }
}
JSON

CURL_SECONDS=$(curl -sS -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  --data-binary @"$OUT_DIR/request.json" \
  -o "$OUT_DIR/full_response.json" \
  -w "%{time_total}")

node - "$OUT_DIR/full_response.json" "$OUT_DIR" "$CURL_SECONDS" <<'NODE'
const fs = require('fs');
const [file, outDir, curlSeconds] = process.argv.slice(2);
const result = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
fs.writeFileSync(`${outDir}/payload.json`, JSON.stringify(result.payload, null, 2));
fs.writeFileSync(`${outDir}/response.json`, JSON.stringify(result.response, null, 2));
fs.writeFileSync(`${outDir}/retrieval.json`, JSON.stringify(result.retrieval, null, 2));
fs.writeFileSync(`${outDir}/metrics.json`, JSON.stringify(result.metrics, null, 2));
fs.writeFileSync(`${outDir}/latency.txt`, `curl_seconds=${curlSeconds}\ngpt_latency_ms=${result.latency.gpt_latency_ms}\nrequest_latency_ms=${result.latency.request_latency_ms}\n`);
fs.writeFileSync(`${outDir}/semantic_analysis.md`, result.semantic_analysis.semantic_analysis_md);
NODE

echo "saved $OUT_DIR"
