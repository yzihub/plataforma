// IMPORTANTE: Todos os redirects usam `origin` extraído do request.url
// para funcionar corretamente em localhost, staging e produção.
// NÃO substituir por process.env.NEXT_PUBLIC_APP_URL aqui.
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  // `next` permite rotear para uma tela específica após criar a sessão.
  // Aceita apenas caminho relativo interno (evita open redirect).
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Fluxo de recuperação de senha (e afins): respeita o destino solicitado
      // — ex.: /reset-password para o usuário definir a nova senha.
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const isGlobalAdmin = user.user_metadata?.role === "global_admin";

      if (isGlobalAdmin) {
        return NextResponse.redirect(`${origin}/control`);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, tenant_id")
        .eq("id", user.id)
        .maybeSingle();

      return NextResponse.redirect(`${origin}${profile?.tenant_id ? "/cockpit" : "/unauthorized"}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
