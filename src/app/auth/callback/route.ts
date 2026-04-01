import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      const isGlobalAdmin = user.user_metadata?.role === "global_admin";

      if (isGlobalAdmin) {
        return NextResponse.redirect(`${origin}/control`);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      return NextResponse.redirect(`${origin}${profile ? "/cockpit" : "/unauthorized"}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
