# Audit Report Format

Every run writes:

```text
tests/ju-behavioral-e2e/reports/<run-id>/
  report.md
  summary.json
  <scenario-id>/
    summary.json
    turn_01.json
    turn_02.json
```

## Run Summary

```json
{
  "run_id": "2026-05-23T...",
  "endpoint": "https://api.yzihub.com/webhook/ju",
  "dry_run": false,
  "started_at": "2026-05-23T...",
  "finished_at": "2026-05-23T...",
  "scenarios": [
    {
      "scenario_id": "high_intent_visit_lead",
      "scenario_name": "High Intent Visit Lead",
      "score": 94,
      "pass": true,
      "critical_violations": 0,
      "warning_violations": 1
    }
  ],
  "regression": {
    "available": true,
    "regressions": []
  }
}
```

## Turn Record

```json
{
  "turn_index": 0,
  "input": "Gostei de um apartamento no Jardim Oceania...",
  "expects": {
    "retrieval": true,
    "tool": true,
    "stage": "visit_intent"
  },
  "payload_file": "tests/ju-behavioral-e2e/payloads/high_intent_visit_lead/turn_01.json",
  "curl": "curl -sS -X POST ...",
  "http_status": 200,
  "latency_ms": 4120,
  "raw_body": "{...}",
  "response_text": "Encontrei uma opcao...",
  "behavior": {
    "score": 96,
    "violations": [],
    "positives": [
      { "id": "direct_property_presentation", "weight": 8 }
    ],
    "response_metrics": {
      "word_count": 42,
      "line_count": 2,
      "question_count": 0,
      "url_count": 1,
      "latency_ms": 4120
    }
  }
}
```

