#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="${JU_E2E_ENDPOINT:-http://localhost:3002/api/ju-super-xml/e2e}"
OUT_DIR="tests/results/scenario_01_hot_lead"
mkdir -p "$OUT_DIR"

cat > "$OUT_DIR/request.json" <<'JSON'
{
  "scenario_id": "01_hot_lead",
  "utm_source": "instagram",
  "utm_campaign": "manaira_high_standard",
  "lead_context": "casal, filho pequeno, orcamento alto, decisao em ate 60 dias, interesse Manaira/Tambau",
  "user_message": "Estamos olhando algo melhor em Manaira ou Tambau, com estrutura para nosso filho pequeno. Queremos decidir em ate uns 60 dias.",
  "expected": {
    "bairro": "Manaira",
    "intent": "alto_padrao",
    "conversation_stage": "refinamento",
    "maturity": "alta",
    "emotional_context": "familia com decisao ativa e criterio premium"
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
