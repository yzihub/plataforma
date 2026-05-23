import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { requireEnv } from '@/lib/env-validation'

const PUBLIC_ROUTES = ['/signin', '/signup', '/reset-password', '/auth/callback', '/unauthorized', '/error-404']
const CONTROL_ROUTE = '/control'
const RUNTIME_ROUTES = ['/api/runtime']

export async function proxy(request: NextRequest) {
  const baseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  if (RUNTIME_ROUTES.some((route) => pathname.startsWith(route))) {
    return baseResponse
  }

  // DEV_BYPASS: skip ALL Supabase calls in development — avoids network round-trip on every request.
  // TenantContext handles the fallback tenant client-side.
  // Never bypass in production (double-check even if env var leaks).
  const isDevBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS === 'true' &&
    process.env.NODE_ENV !== 'production'
  if (isDevBypass) {
    return baseResponse
  }

  let supabaseResponse = baseResponse

  const supabase = createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Atualiza a sessão (obrigatório para SSR)
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error('[proxy] Supabase unreachable, allowing request through:', err instanceof Error ? err.message : err)
    return supabaseResponse
  }

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  const isControlRoute = pathname.startsWith(CONTROL_ROUTE)

  // Usuário autenticado tentando acessar login/signup → redireciona
  if (user && isPublicRoute) {
    const isGlobalAdmin = user.user_metadata?.role === 'global_admin'
    return NextResponse.redirect(
      new URL(isGlobalAdmin ? '/control' : '/cockpit', request.url)
    )
  }

  // Rota protegida sem sessão → vai para login
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/signin', request.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // /control exige role global_admin
  if (user && isControlRoute) {
    const isGlobalAdmin = user.user_metadata?.role === 'global_admin'
    if (!isGlobalAdmin) {
      return NextResponse.redirect(new URL('/cockpit', request.url))
    }
  }

  // /cockpit exige perfil na tabela profiles (Gatekeeper)
  const isCockpitRoute = pathname.startsWith('/cockpit')
  if (user && isCockpitRoute) {
    const isGlobalAdmin = user.user_metadata?.role === 'global_admin'
    if (!isGlobalAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Protege todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico / manifest.webmanifest
     * - arquivos com extensão estática (png, jpg, ico, json, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|txt|xml)$).*)',
  ],
}
