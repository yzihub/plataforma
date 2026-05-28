#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="https://api.yzihub.com/webhook/ju"

# Lead Site - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/lead_site/payload_turn_01.json

# Lead Site - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/lead_site/payload_turn_02.json

# Lead Site - turn 3
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/lead_site/payload_turn_03.json

# Lead Instagram - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/lead_instagram/payload_turn_01.json

# Lead Instagram - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/lead_instagram/payload_turn_02.json

# Lead Instagram - turn 3
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/lead_instagram/payload_turn_03.json

# Lead Referral / Indicacao - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/lead_referral/payload_turn_01.json

# Lead Referral / Indicacao - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/lead_referral/payload_turn_02.json

# Lead Referral / Indicacao - turn 3
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/lead_referral/payload_turn_03.json

# Lead Paid Ad - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/lead_paid_ad/payload_turn_01.json

# Lead Paid Ad - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/lead_paid_ad/payload_turn_02.json

# Investor Lead - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/investor_lead/payload_turn_01.json

# Investor Lead - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/investor_lead/payload_turn_02.json

# Investor Lead - turn 3
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/investor_lead/payload_turn_03.json

# Couple Decision Lead - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/couple_decision_lead/payload_turn_01.json

# Couple Decision Lead - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/couple_decision_lead/payload_turn_02.json

# Couple Decision Lead - turn 3
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/couple_decision_lead/payload_turn_03.json

# Beach Lifestyle Lead - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/beach_lifestyle_lead/payload_turn_01.json

# Beach Lifestyle Lead - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/beach_lifestyle_lead/payload_turn_02.json

# Beach Lifestyle Lead - turn 3
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/beach_lifestyle_lead/payload_turn_03.json

# Luxury Lead - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/luxury_lead/payload_turn_01.json

# Luxury Lead - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/luxury_lead/payload_turn_02.json

# Luxury Lead - turn 3
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/luxury_lead/payload_turn_03.json

# Cold Lead - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/cold_lead/payload_turn_01.json

# Cold Lead - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/cold_lead/payload_turn_02.json

# Re-engagement Lead - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/reengagement_lead/payload_turn_01.json

# Re-engagement Lead - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/reengagement_lead/payload_turn_02.json

# Financing Concern Lead - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/financing_concern_lead/payload_turn_01.json

# Financing Concern Lead - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/financing_concern_lead/payload_turn_02.json

# FGTS Lead - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/fgts_lead/payload_turn_01.json

# FGTS Lead - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/fgts_lead/payload_turn_02.json

# Family Lead - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/family_lead/payload_turn_01.json

# Family Lead - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/family_lead/payload_turn_02.json

# Family Lead - turn 3
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/family_lead/payload_turn_03.json

# Short Stay Investor - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/short_stay_investor/payload_turn_01.json

# Short Stay Investor - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/short_stay_investor/payload_turn_02.json

# Short Stay Investor - turn 3
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/short_stay_investor/payload_turn_03.json

# High Intent Visit Lead - turn 1
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/high_intent_visit_lead/payload_turn_01.json

# High Intent Visit Lead - turn 2
curl -sS -X POST "$ENDPOINT" -H "Content-Type: application/json" --data-binary @tests/ju-behavioral-e2e/reports/ju-live-2026-05-24T02-28-53-647Z-6lby0d/high_intent_visit_lead/payload_turn_02.json

