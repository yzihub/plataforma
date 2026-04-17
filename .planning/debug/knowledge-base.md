# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## cockpit-supabase-fetch-blocking — Infinite loading + hardcoded tenant_id blocking real Supabase data
- **Date:** 2026-04-17
- **Error patterns:** infinite loading, spinner, tenantLoading, hardcoded tenant_id, silent error, loading never resolves, setLoading missing, ImoveisClient, TenantContext, getCockpitData
- **Root cause:** (1) TenantContext setLoading(false) missing in the !user early-return path — loading stayed true forever causing cockpit layout spinner to never resolve; (2) ImoveisClient had hardcoded tenant_id UUID in query — real tenant data never loaded for other tenants; silent error with no console output or UI feedback; (3) queries.ts getCockpitData/getCockpitDataByTenant silently swallowed stagesRes/leadsRes errors — empty arrays returned with no trace in logs.
- **Fix:** Added setLoading(false) to TenantContext !user early-return path; replaced hardcoded UUID with tenant!.id in ImoveisClient query; added console.error + fetchError state in ImoveisClient; added console.error checks for stagesRes.error and leadsRes.error in both getCockpitData and getCockpitDataByTenant.
- **Files changed:** src/context/TenantContext.tsx, src/components/yzihub/ImoveisClient.tsx, src/lib/crm/queries.ts
---

