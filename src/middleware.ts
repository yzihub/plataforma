import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/signin', '/signup', '/reset-password']
const CONTROL_ROUTE = '/control'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
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

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Protege todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico
     * - arquivos com extensão (png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
