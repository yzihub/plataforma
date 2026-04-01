---
phase: 1
slug: access-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest / vitest (Next.js project) |
| **Config file** | jest.config.js or vitest.config.ts (check root) |
| **Quick run command** | `npm run test -- --testPathPattern=auth` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --testPathPattern=auth`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | PROV-02, PROV-03 | manual+sql | `psql -c "SELECT * FROM profiles WHERE email IN ('juremabrokers@gmail.com','contatocafecompam@gmail.com')"` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | AUTH-01, AUTH-02 | e2e/manual | Login as tenant user, verify /cockpit loads tenant data only | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | PROV-04 | e2e/manual | Login with unknown email, verify redirect to /unauthorized | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | AUTH-03 | e2e/manual | Admin login, verify /control accessible without tenant restriction | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | AUTH-04 | e2e/manual | Refresh browser after login, verify session persists | ❌ W0 | ⬜ pending |
| 1-01-06 | 01 | 1 | AUTH-01 | unit | `npm run test -- --testPathPattern=middleware` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/middleware.test.ts` — unit tests for proxy.ts/middleware.ts route guard logic
- [ ] Verify Supabase test env vars available for integration tests

*Most auth behaviors (login flow, session, redirects) require manual E2E verification in browser.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tenant user lands on /cockpit after login | PROV-02, PROV-03 | Requires real Supabase auth session | Login with juremabrokers@gmail.com, check URL = /cockpit |
| Tenant sees only own data | AUTH-02 | Requires real DB rows per tenant | Login as each tenant, verify no cross-tenant data visible |
| Unknown email → /unauthorized | PROV-04 | Requires real auth flow | Login with unlisted email, check redirect |
| Admin → /control unrestricted | AUTH-03 | Requires real admin session | Login as admin, navigate to /control |
| Session persists on refresh | AUTH-04 | Browser state | Refresh after login, verify still authenticated |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
