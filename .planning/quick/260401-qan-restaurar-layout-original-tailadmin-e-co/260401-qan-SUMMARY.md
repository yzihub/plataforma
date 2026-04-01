---
phase: quick-260401-qan
plan: "01"
subsystem: auth
tags: [auth, signin, oauth, google, layout, tailadmin]
dependency_graph:
  requires: []
  provides: [SignInForm TailAdmin layout, dynamic redirectTo for OAuth]
  affects: [src/components/auth/SignInForm.tsx, src/app/auth/callback/route.ts]
tech_stack:
  added: []
  patterns: [window.location.origin for SSR-safe redirect URL]
key_files:
  created: []
  modified:
    - src/components/auth/SignInForm.tsx
    - src/app/auth/callback/route.ts
decisions:
  - redirectTo uses window.location.origin at runtime (not build-time env var) so localhost:3001 works in dev without reconfiguring NEXT_PUBLIC_APP_URL
metrics:
  duration: "~5 min"
  completed: "2026-04-01"
---

# Quick Task 260401-qan: Restaurar Layout TailAdmin e Corrigir OAuth Redirect Summary

**One-liner:** SignInForm restaurado ao padrão TailAdmin dark two-column com Google-only OAuth e redirectTo dinâmico via window.location.origin.

## What Was Done

### Task 1: Restaurar SignInForm com layout TailAdmin e redirectTo dinâmico

Reescrito `src/components/auth/SignInForm.tsx`:

- Removido o link "Back to dashboard" (ChevronLeftIcon + Link)
- Título alterado de "Sign In" para "Bem-vindo de volta"
- Subtítulo atualizado: "Entre com sua conta Google para acessar o Cockpit."
- Adicionado rodapé: "Acesso restrito a usuários autorizados."
- `redirectTo` agora usa `getRedirectUrl()` que prioriza `window.location.origin` em runtime (client-side) e fallback para `NEXT_PUBLIC_APP_URL` apenas em SSR — garantindo que localhost:3001 seja usado em dev independente do valor da variável de ambiente

### Task 2: Blindar callback route contra URL hardcoded

Verificado `src/app/auth/callback/route.ts` — já estava correto, usando `origin` de `new URL(req.url)`. Adicionado comentário de intenção no topo do arquivo para prevenir regressão futura.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/components/auth/SignInForm.tsx` — FOUND
- `src/app/auth/callback/route.ts` — FOUND
- Task 1 commit `d767265` — FOUND
- Task 2 commit `0c69e53` — FOUND
