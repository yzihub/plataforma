# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** Um cliente fecha contrato, recebe acesso ao Cockpit em 24h, e o agente de IA já está qualificando leads no WhatsApp — sem intervenção manual de infra.
**Current focus:** Phase 1 — Access & Auth

## Current Position

Phase: 1 of 6 (Access & Auth)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-04-01 - Completed quick task 260401-hen: Corrigir redirecionamento de Magic Link (profile-aware callback)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Kernel: proxy.ts (not middleware.ts) is the route guard — Next.js 15 convention
- UI: TailAdmin dark is the base; all custom components go in src/components/yzihub/
- Action Flow: frontend never calls n8n directly — always via POST /api/actions/execute → job_queue

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260401-669 | Configurar URL de produção para Magic Links e Auth | 2026-04-01 | f35be4b | [260401-669-configurar-url-de-produ-o-para-magic-lin](./quick/260401-669-configurar-url-de-produ-o-para-magic-lin/) |
| 260401-hen | Corrigir redirecionamento de Magic Link (profile-aware callback) | 2026-04-01 | 41c440f | [260401-hen-corrigir-redirecionamento-de-magic-link-](./quick/260401-hen-corrigir-redirecionamento-de-magic-link-/) |

### Blockers/Concerns

- PROV-02 and PROV-03 are blocked until juremabrokers@gmail.com and contatocafecompam@gmail.com are inserted in `profiles` — immediate Phase 1 action
- DEPL-03 (RLS validation) depends on Phase 1 auth isolation work; Phase 6 should be planned after Phase 1 completes

## Session Continuity

Last session: 2026-03-31
Stopped at: Roadmap created — ready to plan Phase 1
Resume file: None
