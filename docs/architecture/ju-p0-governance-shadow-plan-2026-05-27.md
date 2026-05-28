# Ju P0 Governance Shadow Plan - 2026-05-27

## Scope

P0 only measures drift. It does not cut over authority, does not move writes to Pipeline B, and does not remove n8n/LangChain from the hot path.

## Delivered Artifacts

- Migration: `supabase/migrations/035_ju_p0_governance_shadow_decisions.sql`
- Rollback: `supabase/rollbacks/035_ju_p0_governance_shadow_decisions.rollback.sql`
- Read-only decision endpoint: `POST /cognitive/decide`
- Divergence dashboard endpoint: `GET /shadow/divergence`
- n8n branch: `Shadow Cognitive Decision`, connected in parallel from `Build Context`

## Migration Impact

The migration is additive:

- Adds `governance_version`, `owner_pipeline`, and `funnel_stage_canonical` to `ju_runtime_states`.
- Creates `ju_runtime_shadow_decisions` for P0 shadow measurements.
- Enables RLS on the new table with tenant-scoped select/insert policies.

Expected locks:

- `ALTER TABLE ju_runtime_states ADD COLUMN`: brief `ACCESS EXCLUSIVE` lock. Defaults are constant and should be metadata-only on supported Postgres versions, but still schedule in a low-traffic window.
- `ADD CONSTRAINT CHECK`: brief table lock while validating existing rows.
- `CREATE INDEX IF NOT EXISTS`: non-concurrent in this migration file, so it takes a stronger table lock during index build. For production, run during low traffic or convert to `CREATE INDEX CONCURRENTLY` manually outside a transaction after review.
- `CREATE TABLE`, RLS policies, and indexes on the new empty table have negligible impact.

Backward compatibility:

- Existing reads/writes to `ju_runtime_states` continue to work because all new columns have defaults or are nullable.
- No existing table is dropped or renamed.
- `ju_runtime_shadow_decisions` is append-only for P0 telemetry and is not required by the hot-path response.

## Runtime Semantics

`POST /cognitive/decide` is read-only:

- No outbound.
- No tool execution.
- No writes to `ju_runtime_states`.
- No memory persistence.
- It returns `decision`, `signals`, `runtime_memory`, compact context metadata, and a field-level divergence comparison against the n8n decision snapshot.

## n8n Semantics

`Shadow Cognitive Decision` is a parallel branch from `Build Context`.

- It does not feed `Atendente`.
- It does not alter `output`.
- It catches runtime and persistence failures.
- It persists telemetry to `ju_runtime_shadow_decisions` when the migration is present.

## Metrics

`GET /shadow/divergence` exposes:

- divergence rate
- retrieval divergence
- next_best_action divergence
- stage divergence
- fallback rate
- timeout rate
- shadow failure rate
- retrieval activation mismatch
- property presentation mismatch

P1 remains blocked until 7 full days of shadow data exist with known baseline, known divergence, and known fallback rate.

## Dry-Run

No production migration was applied in this pass.

Validated locally:

- `npm.cmd run typecheck`
- `npm.cmd test -- tests/runtime/divergence-engine.test.ts`
- workflow JSON parse
- `Build Context` still connects to `Atendente` and now also to `Shadow Cognitive Decision`

Supabase CLI was not available in this workspace, so database dry-run must be executed with a reviewed staging/local Postgres before production:

```bash
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/035_ju_p0_governance_shadow_decisions.sql
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/rollbacks/035_ju_p0_governance_shadow_decisions.rollback.sql
```

## Rollback Plan

1. Disable or remove the `Shadow Cognitive Decision` branch in n8n.
2. Stop calling `POST /cognitive/decide`.
3. Run `supabase/rollbacks/035_ju_p0_governance_shadow_decisions.rollback.sql` after review.
4. Keep `JUREMA_CUTOVER_SHADOW_ONLY=true` and `JUREMA_CUTOVER_READINESS_LEVEL=0`.

## Risks

- The n8n branch depends on `RUNTIME_COGNITIVE_WEBHOOK_SECRET` or equivalent secret availability.
- If `ju_runtime_shadow_decisions` is not deployed, n8n catches persistence failure and production output remains unaffected, but metrics will be absent.
- Dashboard metrics are only as complete as the n8n shadow snapshot fields.
- Existing `Build Context` still performs cognitive heuristics during P0 by design, because P2 is not authorized yet.
