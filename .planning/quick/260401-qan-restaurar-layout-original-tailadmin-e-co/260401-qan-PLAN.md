---
phase: quick-260401-qan
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/auth/SignInForm.tsx
  - src/app/auth/callback/route.ts
autonomous: true
requirements: [QAN-01]

must_haves:
  truths:
    - "Clicar em 'Entrar com Google' no localhost:3001 redireciona de volta para localhost:3001/auth/callback"
    - "Após autenticação o usuário aterra em /cockpit (ou /control se global_admin)"
    - "A página /signin exibe layout duas colunas: form à esquerda, logo/ilustração à direita (DNA TailAdmin)"
    - "Nenhum campo de e-mail, senha ou magic link aparece — apenas o botão Google"
  artifacts:
    - path: "src/components/auth/SignInForm.tsx"
      provides: "Formulário de login com botão Google único e redirectTo dinâmico"
    - path: "src/app/auth/callback/route.ts"
      provides: "Callback que redireciona para /cockpit ou /control sem URL hardcoded"
  key_links:
    - from: "SignInForm.tsx"
      to: "supabase.auth.signInWithOAuth"
      via: "redirectTo usa window.location.origin em dev, NEXT_PUBLIC_APP_URL em prod"
    - from: "callback/route.ts"
      to: "/cockpit ou /control"
      via: "new URL('/cockpit', request.url) — usa origin do request, não hardcoded"
---

<objective>
Restaurar o layout original TailAdmin de duas colunas na página de login e garantir que o fluxo OAuth Google funcione corretamente no localhost:3001.

Purpose: O layout de auth já está estruturado corretamente no AuthLayout (src/app/(full-width-pages)/(auth)/layout.tsx) com duas colunas, mas o SignInForm precisa preencher corretamente a coluna esquerda com o visual TailAdmin dark padrão. O redirectTo do OAuth precisa usar `window.location.origin` em dev para evitar redirecionamento para a URL de produção configurada em NEXT_PUBLIC_APP_URL.

Output: Página /signin fiel ao demo.tailadmin.com/signin, com fluxo Google funcional no localhost:3001.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<!-- Layout de duas colunas já existe no AuthLayout: src/app/(full-width-pages)/(auth)/layout.tsx -->
<!-- O children slot (coluna esquerda) é preenchido por SignInForm via signin/page.tsx -->
<!-- proxy.ts já tem as rotas de auth como públicas — não alterar -->
<!-- .env.local: NEXT_PUBLIC_APP_URL=http://localhost:3001 -->
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restaurar SignInForm com layout TailAdmin e redirectTo dinâmico</name>
  <files>src/components/auth/SignInForm.tsx</files>
  <action>
Reescrever src/components/auth/SignInForm.tsx para:

1. LAYOUT (DNA TailAdmin dark — coluna esquerda do AuthLayout):
   - Container: `flex flex-col flex-1 lg:w-1/2 w-full` (já preenche a coluna esquerda do AuthLayout)
   - Padding interno: `w-full max-w-md mx-auto` centralizado verticalmente com `flex flex-col justify-center flex-1`
   - Cabeçalho: logo YZI (ou texto "YZI OS") + título "Bem-vindo de volta" + subtítulo "Entre com sua conta Google para acessar o Cockpit."
   - Separador visual simples (linha ou espaçamento)
   - Botão Google: estilo TailAdmin padrão com ícone Google SVG (já existe no componente atual), label "Entrar com Google"
   - Rodapé: texto pequeno de disclaimer ("Acesso restrito a usuários autorizados.")

2. REDIRECT TO DINÂMICO (evitar redirect para produção em dev):
   ```typescript
   const getRedirectUrl = () => {
     // Em dev, sempre usar window.location.origin para respeitar a porta (3001)
     // Em prod, NEXT_PUBLIC_APP_URL é confiável
     if (typeof window !== 'undefined') {
       return `${window.location.origin}/auth/callback`
     }
     return `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
   }
   ```
   Usar `getRedirectUrl()` no `options.redirectTo` do `signInWithOAuth`.

3. MANTER: tratamento de erro, estado de loading, o SVG do Google já existente.

4. REMOVER: qualquer campo de e-mail, senha, magic link, ou link "Back to dashboard".

Não alterar src/app/(full-width-pages)/(auth)/layout.tsx — o layout de duas colunas já está correto lá.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit --project tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>
    - SignInForm renderiza apenas o botão "Entrar com Google" (sem campos de email/senha/magic link)
    - redirectTo usa window.location.origin em runtime (garante localhost:3001 em dev)
    - TypeScript compila sem erros no arquivo modificado
  </done>
</task>

<task type="auto">
  <name>Task 2: Verificar e blindar callback route contra URL hardcoded</name>
  <files>src/app/auth/callback/route.ts</files>
  <action>
Revisar src/app/auth/callback/route.ts (já existe e usa `origin` do request.url — está correto).

Verificar que:
1. `const { searchParams, origin } = new URL(req.url)` — origin vem do request, não hardcoded.
2. Todos os redirects usam `${origin}/...` ou `new URL('/path', request.url)` — NUNCA string literal de domínio.
3. O redirect para /signin em caso de erro também usa `${origin}/signin?error=auth`.

Se o arquivo já está correto (o que a leitura indica), adicionar apenas um comentário no topo documentando a intenção:
```typescript
// IMPORTANTE: Todos os redirects usam `origin` extraído do request.url
// para funcionar corretamente em localhost, staging e produção.
// NÃO substituir por process.env.NEXT_PUBLIC_APP_URL aqui.
```

Se houver qualquer URL hardcoded (vercel.app, yzihub.com), substituir por `${origin}/...`.
  </action>
  <verify>
    <automated>grep -n "vercel\|yzihub\.com\|hardcoded\|NEXT_PUBLIC_APP_URL" D:/dev/plataforma/src/app/auth/callback/route.ts || echo "OK: sem URLs hardcoded"</automated>
  </verify>
  <done>
    - Nenhuma URL de domínio hardcoded no arquivo
    - Todos os redirects derivam o domínio de request.url
    - Comentário de intenção presente para prevenir regressão futura
  </done>
</task>

</tasks>

<verification>
Fluxo completo esperado no localhost:3001:
1. Acessar http://localhost:3001/signin
2. Ver layout duas colunas (form esquerda + logo/ilustração direita)
3. Clicar "Entrar com Google" → Supabase redireciona para Google OAuth
4. Após autenticação Google → callback em http://localhost:3001/auth/callback
5. Callback redireciona para http://localhost:3001/cockpit (ou /control para global_admin)

Pré-requisito externo: No painel Supabase > Authentication > URL Configuration, a URL `http://localhost:3001/auth/callback` deve estar na lista de "Redirect URLs" permitidas. Isso é configuração manual no dashboard do Supabase — Claude não pode fazer isso.
</verification>

<success_criteria>
- /signin exibe exatamente o layout TailAdmin de duas colunas com apenas o botão Google
- Clicar em "Entrar com Google" no localhost:3001 retorna para localhost:3001/auth/callback (não para vercel/produção)
- TypeScript compila sem novos erros
- proxy.ts não precisa de alteração (rotas de auth já são públicas)
</success_criteria>

<output>
Após conclusão, criar `.planning/quick/260401-qan-restaurar-layout-original-tailadmin-e-co/260401-qan-SUMMARY.md`
</output>
